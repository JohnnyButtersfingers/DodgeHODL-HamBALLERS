# 🏆 XPBadge Contract Deployment Guide

## ✅ **Contract Status: Ready for Deployment**

The XPBadge contract has been successfully compiled and tested on the hardhat network. Here's how to deploy it to Abstract testnet:

## 🚀 **Step 1: Set Up Environment**

### 1.1 Create .env file
```bash
cd hamballer-game-starter/contracts
cp .env.example .env
```

### 1.2 Add Your Private Key
Edit the `.env` file and add your private key:
```env
# Abstract Testnet RPC
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz

# Private key for deployment (DO NOT commit this)
PRIVATE_KEY=your_actual_private_key_here

# Etherscan API key for contract verification (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Gas settings
GAS_PRICE=1000000000
GAS_LIMIT=8000000
```

### 1.3 Get Test ETH
If you don't have test ETH:
1. Visit: https://faucet.testnet.abs.xyz
2. Request test ETH for your wallet
3. Wait for confirmation

## 🎯 **Step 2: Deploy Contract**

### 2.1 Deploy XPBadge Only
```bash
npm run deploy:xp-badge
```

### 2.2 Deploy All Contracts (Including XPBadge)
```bash
npm run deploy:production
```

### 2.3 Expected Output
```
🏆 Deploying XPBadge contract...
✅ XPBadge deployed to: 0x... (your actual address)
📊 Total badges created: 5
🎖️ Badge 1: Novice HODLer (100 XP)
🎖️ Badge 2: Experienced Trader (500 XP)
🎖️ Badge 3: Master Strategist (1000 XP)
🎖️ Badge 4: Legendary HODLer (2500 XP)
🎖️ Badge 5: Supreme Champion (5000 XP)
```

## ⚙️ **Step 3: Configure Environment Variables**

### 3.1 Backend Configuration
Add to `backend/.env`:
```env
# XP Badge Contract
XP_BADGE_ADDRESS=0x... # Your deployed XPBadge address
```

### 3.2 Frontend Configuration
Add to `frontend/.env`:
```env
# XP Badge Contract
VITE_XP_BADGE_ADDRESS=0x... # Your deployed XPBadge address
```

## 🧪 **Step 4: Test the System**

### 4.1 Test Badge Minting
```bash
cd ../backend
node scripts/test-badge-minting.js test
```

### 4.2 Expected Test Output
```
🏆 Testing Badge Minting Functionality
=====================================

📊 Initial XP Check:
   0x1234...: 0 XP

🎯 Testing XP progression for 0x1234...

🎮 First run:
   🏃 Simulating RunCompleted for 0x1234...
   XP Earned: 50
   DBP Earned: 8
   ✅ New XP Total: 50
   ⏳ No badges eligible yet

🎮 Second run:
   🏃 Simulating RunCompleted for 0x1234...
   XP Earned: 100
   DBP Earned: 15
   ✅ New XP Total: 150
   🏆 Eligible Badges:
      - Novice HODLer (100 XP) - 50 XP over

🏆 Final Badge Eligibility Check:
   Total XP: 1150
   Eligible Badges: 3
   ✅ Novice HODLer - Ready to mint!
   ✅ Experienced Trader - Ready to mint!
   ✅ Master Strategist - Ready to mint!
```

## 🔧 **Step 5: Verify Contract (Optional)**

### 5.1 Get Etherscan API Key
1. Visit: https://explorer.testnet.abs.xyz
2. Create account and get API key

### 5.2 Verify Contract
```bash
npx hardhat verify --network abstract 0x... # Your XPBadge address
```

## 🎮 **Step 6: Frontend Integration**

### 6.1 Start Frontend
```bash
cd ../frontend
npm run dev
```

### 6.2 Test Badge UI
1. Navigate to `/badges`
2. Connect wallet with sufficient XP
3. Verify eligible badges are displayed
4. Test badge minting functionality

## 📊 **Contract Details**

### Badge System
- **5 Default Badges**: Novice HODLer (100 XP) → Supreme Champion (5000 XP)
- **ERC-1155 Standard**: Efficient badge management
- **XP Verification**: Prevents unauthorized minting
- **Ownership Tracking**: Prevents duplicate badges

### Key Functions
- `mintBadge(badgeId, xpRequired)` - Mint a badge
- `getBadgeInfo(badgeId)` - Get badge details
- `getPlayerBadges(player)` - Get player's badges
- `hasPlayerBadge(player, badgeId)` - Check ownership
- `getAvailableBadges(player, playerXP)` - Get eligible badges

## 🚨 **Troubleshooting**

### Common Issues

#### Private Key Error
```
Error: factory runner does not support sending transactions
```
**Solution:** Add your private key to `.env` file

#### Network Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Check RPC URL and internet connection

#### Gas Limit Error
```
Error: gas required exceeds allowance
```
**Solution:** Increase GAS_LIMIT in `.env`

#### Insufficient Balance
```
Error: insufficient funds
```
**Solution:** Get test ETH from faucet

## ✅ **Deployment Checklist**

- [ ] Private key added to `.env`
- [ ] Test ETH received from faucet
- [ ] XPBadge contract deployed
- [ ] Contract address added to backend `.env`
- [ ] Contract address added to frontend `.env`
- [ ] Badge minting test passed
- [ ] Frontend badge UI functional
- [ ] Contract verified on block explorer (optional)

## 🎉 **Success Criteria**

The XP Badge system is successfully deployed when:
1. ✅ XPBadge contract is deployed and verified
2. ✅ Badge eligibility is correctly calculated
3. ✅ Badge minting works via frontend
4. ✅ XP progression triggers badge availability
5. ✅ Badge ownership is properly tracked

---

**🎮 Ready to deploy! Just add your private key and run the deployment command.** 🏆 