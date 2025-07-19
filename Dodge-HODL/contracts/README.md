# Contract Deployment Guide

## Prerequisites
1. Set up your .env file with:
   ```
   PRIVATE_KEY=your_wallet_private_key
   ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
   ETHERSCAN_API_KEY=your_api_key_for_verification
   ```

2. Fund your deployer wallet with Abstract testnet ETH

## Local Development
```bash
# Start local Hardhat node
npx hardhat node

# In another terminal, deploy to localhost
npx hardhat run scripts/deploy_all.js --network localhost
```

## Abstract Testnet Deployment
```bash
# Deploy to Abstract testnet
npx hardhat run scripts/deploy_all.js --network abstract

# Verify contracts (automatic in deploy script)
npx hardhat verify --network abstract <contract_address> <constructor_args>
```

## Post-Deployment Steps
1. Copy contract addresses from deployment output
2. Update .env file with deployed addresses
3. Update backend/frontend configuration files
4. Initialize game settings (CP rates, boost configurations)

## Contract Addresses (Abstract Testnet)
- DBP Token: `TBD`
- Boost NFT: `TBD`
- HODL Manager: `TBD`

## Key Features Implemented
✅ **DBPToken.sol**
- ERC-20 with minting/burning
- Role-based access control
- Transfer restrictions for game balance
- Pausable for emergencies

✅ **BoostNFT.sol**
- ERC-1155 for multiple boost types
- One-time use mechanics
- Supply tracking and rarity system
- 5 initial boost types configured

✅ **HODLManager.sol**
- Complete game state management
- CP to DBP conversion (10:1 ratio)
- Bonus Throw™ mechanics (2x multiplier)
- On-chain RNG for fairness
- Player statistics tracking
- NFT boost integration

## Testing
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/Integration.test.js

# Generate coverage report
npx hardhat coverage
```
