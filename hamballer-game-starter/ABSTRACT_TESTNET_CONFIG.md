# Abstract Testnet Configuration Guide

## Overview
This guide covers the complete configuration of HamBaller.xyz for deployment on Abstract Testnet.

## Environment Configuration

### 1. .env File Setup

The `.env` file has been configured with the following structure:

```bash
# ABS Wallet Configuration
ABS_WALLET_ADDRESS=0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388
ABS_WALLET_PRIVATE_KEY=your_private_key_here_do_not_share

# Network Configuration (Abstract Testnet)
NETWORK=abstract
TESTNET_RPC_URL=https://rpc.abstract.xyz
ABSTRACT_RPC_URL=https://rpc.abstract.xyz
ABSTRACT_TESTNET_CHAIN_ID=11124
```

### 2. Security Checklist

- [x] `.env` is included in `.gitignore`
- [x] Template values require replacement before use
- [x] Private keys are never committed to version control
- [x] Different keys should be used for testnet vs mainnet

### 3. Required Updates

Before deployment, replace these placeholder values:
- `your_private_key_here_do_not_share` - Replace with actual private key
- `your_supabase_url_here` - Replace with Supabase project URL
- `your_supabase_service_key_here` - Replace with Supabase service key
- `your_minter_private_key_here_do_not_share` - Replace with XP Badge minter key

## Hardhat Configuration

The `hardhat.config.js` has been updated to:
- Load environment variables with validation
- Support both `ABS_WALLET_PRIVATE_KEY` and `PRIVATE_KEY` (fallback)
- Validate required configuration before deployment
- Configure Abstract Testnet with proper chain ID (11124)

## Deployment Scripts

### 1. Test Wallet Configuration
```bash
cd contracts
npx hardhat run scripts/test-wallet-config.js --network abstract
```

This script will:
- Verify environment variables are set
- Check wallet balance
- Confirm network connection
- Estimate deployment costs

### 2. Deploy XP Contracts
```bash
npx hardhat run scripts/deploy-xp-contracts.js --network abstract
```

This script will:
- Deploy XPBadge NFT contract
- Deploy XPVerifier contract
- Set up initial permissions
- Save deployment addresses
- Provide contract verification links

### 3. Deploy All Contracts
```bash
npx hardhat run scripts/deploy_all.js --network abstract
```

## Post-Deployment Steps

### 1. Update .env with Contract Addresses
After deployment, add these to your `.env`:
```bash
DBP_TOKEN_ADDRESS=0x...
BOOST_NFT_ADDRESS=0x...
HODL_MANAGER_ADDRESS=0x...
XPBADGE_ADDRESS=0x...
XPVERIFIER_ADDRESS=0x...
```

### 2. Configure Backend Minter
1. Generate a new wallet for backend minting
2. Add its private key as `XPBADGE_MINTER_PRIVATE_KEY`
3. Grant MINTER_ROLE to the backend wallet address

### 3. Frontend Configuration
The frontend will automatically use these environment variables:
- `VITE_ABSTRACT_RPC_URL`
- `VITE_ABSTRACT_CHAIN_ID`
- `VITE_NETWORK`

## Network Information

### Abstract Testnet Details
- **Network Name**: Abstract Testnet
- **Chain ID**: 11124
- **RPC URL**: https://rpc.abstract.xyz
- **Explorer**: https://explorer.testnet.abs.xyz
- **Faucet**: https://faucet.testnet.abs.xyz

### Gas Configuration
- **Gas Price**: 1 gwei (default)
- **Gas Limit**: 8,000,000 (adjustable)

## Troubleshooting

### Common Issues

1. **"Missing required private key" error**
   - Ensure `ABS_WALLET_PRIVATE_KEY` is set in `.env`
   - Remove quotes around the private key value

2. **"Deployer has no ETH balance" error**
   - Visit https://faucet.testnet.abs.xyz
   - Request testnet ETH for your wallet address

3. **"Connected to wrong network" warning**
   - Verify `TESTNET_RPC_URL` is correct
   - Check that chain ID is 11124

4. **Transaction failures**
   - Increase gas limit in `.env`
   - Check wallet balance is sufficient

## Verification Commands

### Check Environment
```bash
node -e "require('dotenv').config(); console.log(process.env.ABS_WALLET_ADDRESS)"
```

### Test RPC Connection
```bash
curl -X POST https://rpc.abstract.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected response: `{"jsonrpc":"2.0","id":1,"result":"0x2b84"}` (11124 in hex)

## Security Best Practices

1. **Never share private keys**
   - Use environment variables only
   - Rotate keys regularly
   - Use hardware wallets for production

2. **Separate keys by environment**
   - Different keys for testnet/mainnet
   - Different keys for deployment/operations
   - Dedicated minter wallets

3. **Monitor wallet activity**
   - Check explorer regularly
   - Set up alerts for transactions
   - Keep minimal funds in hot wallets

## Next Steps

1. Complete wallet funding
2. Run wallet configuration test
3. Deploy contracts
4. Update environment with addresses
5. Configure backend services
6. Test end-to-end functionality

---

For questions or issues, refer to the main deployment guide or contact the development team.