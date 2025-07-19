# 🔐 Environment Variables & Security Guide

## Important Security Notes

⚠️ **NEVER commit private keys to version control!**

The `.env` files created in this repository contain placeholder values for sensitive information. You must replace these placeholders with your actual values.

## Required Setup for Address: 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388

### 1. Private Key Setup
Replace `YOUR_PRIVATE_KEY_HERE_FOR_0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388` in the following files:
- `contracts/.env`
- `backend/.env` 
- `.env` (root level)

**How to get your private key:**
- Export from MetaMask: Account menu → Account details → Export private key
- Or use your wallet's export functionality
- Format: `0x...` (64 hex characters)

### 2. Get Test ETH
Visit the Abstract testnet faucet: https://faucet.testnet.abs.xyz
- Connect your wallet with address: 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388
- Request test ETH for contract deployment and transactions

### 3. Supabase Setup (Optional)
If using the database features:
1. Create account at https://supabase.com
2. Create new project
3. Get your project URL and anon key from Settings → API
4. Replace placeholders in `backend/.env` and `.env`

### 4. WalletConnect Setup (Optional)
For frontend wallet integration:
1. Create account at https://walletconnect.com
2. Create new project
3. Get your project ID
4. Replace `your_project_id_here` in `frontend/.env`

## Abstract Testnet Configuration

The environment files are pre-configured for Abstract testnet:
- **RPC URL**: https://api.testnet.abs.xyz
- **Chain ID**: 11124
- **Faucet**: https://faucet.testnet.abs.xyz
- **Your Wallet**: 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388

## File Structure

```
hamballer-game-starter/
├── .env                  # Main environment file
├── contracts/.env        # Smart contract deployment
├── backend/.env         # Backend API configuration  
└── frontend/.env        # Frontend/UI configuration
```

## Best Practices

1. **Never share private keys** via chat, email, or any communication channel
2. **Use different wallets** for development vs production
3. **Keep test amounts small** - only request what you need from faucets
4. **Regularly rotate keys** if they may have been compromised
5. **Use hardware wallets** for production environments

## Verification

After setup, verify your configuration:
```bash
# Check that .env files exist and are not tracked by git
git status
# Should show .env files as untracked (ignored)

# Test connection to Abstract testnet
curl -X POST https://api.testnet.abs.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Troubleshooting

- **"Insufficient funds"**: Get more test ETH from faucet
- **"Invalid private key"**: Check format (should start with 0x)
- **Connection errors**: Verify RPC URL and internet connection
- **Contract deployment fails**: Ensure wallet has test ETH and correct network