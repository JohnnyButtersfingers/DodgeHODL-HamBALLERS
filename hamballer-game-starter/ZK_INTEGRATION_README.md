# 🔐 Phase 9: ZK-SNARK Integration

## Overview

This implementation adds Zero-Knowledge proof verification to the HamBaller.xyz platform, enabling players to prove their XP claims without revealing sensitive game data. The system uses Groth16 ZK-SNARKs via circom circuits and snarkjs for proof generation and verification.

## 🏗️ Architecture

### Components

1. **XPVerifier Smart Contract** (`contracts/contracts/XPVerifier.sol`)
   - Verifies Groth16 proofs on-chain
   - Prevents replay attacks using nullifiers
   - Manages verification thresholds

2. **Circom Circuit** (`contracts/circuits/xp_verification.circom`)
   - Defines the XP verification logic
   - Generates nullifiers to prevent double-spending
   - Validates XP claims with threshold checks

3. **Backend ZK Service** (`backend/services/zkProofGenerator.js`)
   - Generates ZK proofs using snarkjs
   - Handles circuit witness calculation
   - Provides test proofs for development

4. **Frontend Integration** 
   - ZK utilities (`frontend/src/utils/zkUtils.js`)
   - Updated ClaimBadge component
   - Proof validation and error handling

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Run the automated setup
./test-zk-integration.sh

# Or manually install
pnpm install:all
```

### 2. Deploy XPVerifier Contract

```bash
cd contracts
npx hardhat run scripts/deploy_xpverifier.js --network abstract
```

### 3. Configure Backend

Update your backend `.env` file with the deployed contract address:

```env
XPVERIFIER_ADDRESS=0x...
XPVERIFIER_PRIVATE_KEY=your_private_key
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
```

### 4. Start Development

```bash
pnpm start:dev
```

## 🔧 Technical Details

### ZK Circuit Logic

The XP verification circuit proves:

1. **Secret Knowledge**: Player knows a secret corresponding to their wallet
2. **XP Validity**: Claimed XP matches actual earned XP
3. **Threshold Compliance**: XP amount meets verification requirements
4. **Uniqueness**: Generates nullifier to prevent replay attacks

### Public Inputs
- `nullifier`: Unique identifier preventing double-spending
- `claimedXP`: Amount of XP being claimed  
- `threshold`: Minimum XP requiring verification

### Private Inputs
- `secret`: Player's secret key/nonce
- `playerAddress`: Player's wallet address
- `runId`: Game run identifier
- `actualXP`: Actual XP earned (verified off-chain)

### Smart Contract Interface

```solidity
function verifyXPProof(
    bytes32 nullifier,
    bytes32 commitment, 
    uint256[8] calldata proof,
    uint256 claimedXP,
    uint256 currentThreshold
) external returns (bool verified)
```

## 🧪 Testing

### Run All Tests

```bash
./test-zk-integration.sh
```

### Manual Testing

1. **Backend Proof Generation**
```bash
cd backend
curl -X POST http://localhost:3001/api/xp/test-proof \
  -H "Content-Type: application/json" \
  -d '{"playerAddress": "0x...", "xpClaimed": 75}'
```

2. **Frontend Badge Claiming**
   - Navigate to `/badges` route
   - Connect wallet with MetaMask
   - Claim badges with XP ≥ 50 (triggers ZK verification)

3. **Contract Verification**
```bash
cd contracts
npx hardhat test
```

## 🔐 Security Features

### Replay Attack Prevention
- Nullifiers ensure each XP claim is unique
- On-chain nullifier tracking prevents double-spending

### Privacy Protection
- XP amounts are public (necessary for verification)
- Player secrets and run details remain private
- Circuit design prevents information leakage

### Threshold Management
- Configurable XP threshold for requiring proofs
- Lower XP claims bypass ZK verification for efficiency
- Admin-only threshold updates

## 📚 API Endpoints

### ZK Proof Generation
```http
POST /api/xp/generate-proof
{
  "playerAddress": "0x...",
  "xpClaimed": 75,
  "runId": "run_123"
}
```

### Test Proof Generation  
```http
POST /api/xp/test-proof
{
  "playerAddress": "0x...", 
  "xpClaimed": 75
}
```

### Proof Status
```http
GET /api/xp/proof-status
```

### Local Proof Verification
```http
POST /api/xp/verify-proof
{
  "proofData": { ... }
}
```

## 🛠️ Development Modes

### Test Mode (Default)
- Uses dummy circuit files
- Generates valid test proofs
- Suitable for development and UI testing
- No circom compilation required

### Production Mode
- Requires compiled circom circuits
- Real trusted setup and proving keys
- Full cryptographic security
- Circuit compilation needed

## 📝 Configuration

### Backend Environment Variables

```env
# ZK Configuration
XPVERIFIER_ADDRESS=0x...           # Deployed contract address
XPVERIFIER_PRIVATE_KEY=0x...       # Deployer private key
XPVERIFIER_THRESHOLD=50            # XP threshold for verification

# Network Configuration  
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
NETWORK_NAME=abstract-testnet
```

### Frontend Configuration

No additional configuration required. The frontend automatically:
- Detects available ZK verification
- Falls back gracefully if unavailable
- Handles proof generation errors

## 🚨 Troubleshooting

### Common Issues

1. **"ZK proof generator not initialized"**
   - Check backend environment variables
   - Ensure contract is deployed and accessible
   - Verify network connectivity

2. **"Nullifier already used"**
   - This is expected behavior (replay protection)
   - Each XP claim can only be verified once
   - Generate new proof for different runs

3. **"XP below threshold"**
   - XP amount is below verification requirement
   - Claims under threshold don't need proofs
   - This is normal behavior for small XP amounts

4. **Contract deployment failures**
   - Check account has sufficient ETH for gas
   - Verify network configuration
   - Ensure proper wallet connection

### Debug Mode

Enable verbose logging:

```bash
DEBUG=zk:* npm run dev  # Backend
DEBUG=true npm run dev  # Frontend
```

## 🔄 Upgrade Path

### Circuit Updates
1. Update circom circuit file
2. Recompile with `pnpm compile-circuit`
3. Generate new trusted setup
4. Deploy new verifying key to contract
5. Update backend verification key

### Contract Updates
1. Deploy new XPVerifier contract
2. Update backend configuration
3. Update frontend contract addresses
4. Migrate existing data if needed

## 📊 Performance

### Gas Costs
- Proof verification: ~300k gas
- Nullifier storage: ~20k gas  
- Total per verification: ~320k gas

### Proof Generation Time
- Test mode: <100ms
- Production mode: 2-5 seconds (depending on circuit complexity)

### Circuit Constraints
- Current circuit: ~1000 constraints
- Proving time: <1 second
- Proof size: 256 bytes

## 🌟 Future Enhancements

### Planned Features
1. **Batch Verification**: Verify multiple proofs in single transaction
2. **Circuit Optimization**: Reduce constraint count for faster proving
3. **Mobile Support**: Optimize for mobile proof generation
4. **Advanced Privacy**: Hide XP amounts for enhanced privacy

### Possible Integrations
1. **Achievement Proofs**: ZK proofs for complex achievement criteria
2. **Leaderboard Privacy**: Private leaderboard rankings
3. **Tournament Verification**: ZK proofs for tournament eligibility

## 📜 License

This ZK integration is part of the HamBaller.xyz project and follows the same MIT license terms.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch for ZK improvements
3. Test thoroughly with both test and production modes
4. Submit pull request with detailed description

---

**Note**: This implementation prioritizes development speed and testing. For production deployment, ensure proper trusted setup ceremony and security audit of circuits and contracts.