# 🏆 XP Badge System Deployment Guide

This guide covers the complete deployment and testing of the XP Badge system for HamBaller.xyz.

## 📋 **Prerequisites**

- ✅ HamBaller contracts deployed (DBP Token, Boost NFT, HODL Manager)
- ✅ Backend running with Supabase configured
- ✅ Frontend built and ready
- ✅ Abstract testnet RPC access

## 🚀 **Step 1: Deploy XPBadge Contract**

### Option A: Deploy XPBadge Only
```bash
cd hamballer-game-starter/contracts
npm run deploy:xp-badge
```

### Option B: Deploy All Contracts (Including XPBadge)
```bash
cd hamballer-game-starter/contracts
npm run deploy:production
```

### Expected Output:
```
🏆 Deploying XPBadge contract...
✅ XPBadge deployed to: 0x...
📊 Total badges created: 5
🎖️ Badge 1: Novice HODLer (100 XP)
🎖️ Badge 2: Experienced Trader (500 XP)
🎖️ Badge 3: Master Strategist (1000 XP)
🎖️ Badge 4: Legendary HODLer (2500 XP)
🎖️ Badge 5: Supreme Champion (5000 XP)
```

## ⚙️ **Step 2: Configure Environment Variables**

### Backend Configuration
Add to `backend/.env`:
```env
# XP Badge Contract
XP_BADGE_ADDRESS=0x... # Your deployed XPBadge address
```

### Frontend Configuration
Add to `frontend/.env`:
```env
# XP Badge Contract
VITE_XP_BADGE_ADDRESS=0x... # Your deployed XPBadge address
```

### Update Contracts Config
The frontend will automatically load the XP Badge address from environment variables. If you prefer to use a static config, update `frontend/src/config/contracts.js`:

```javascript
export const CONTRACTS = {
  // ... existing contracts
  xpBadge: {
    address: "0x...", // Your deployed address
    abi: XPBadgeABI // Import from your contract artifacts
  }
};
```

## 🧪 **Step 3: Test Badge System**

### 3.1 Test XP Progression
```bash
cd hamballer-game-starter/backend
node scripts/test-badge-minting.js test
```

This will:
- ✅ Simulate multiple runs to increase XP
- ✅ Check badge eligibility at each milestone
- ✅ Verify XP tracking in Supabase
- ✅ Test contract interaction (if configured)

### 3.2 Test Individual Commands
```bash
# Check XP for a wallet
node scripts/test-badge-minting.js xp 0x1234...

# Check badge eligibility
node scripts/test-badge-minting.js badges 0x1234...

# Simulate single run
node scripts/test-badge-minting.js simulate 0x1234... 200 30
```

### 3.3 Expected Test Output:
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

## 🎮 **Step 4: Frontend Integration Testing**

### 4.1 Start Frontend
```bash
cd hamballer-game-starter/frontend
npm run dev
```

### 4.2 Test Badge UI
1. Navigate to `/badges` in the frontend
2. Connect wallet with sufficient XP
3. Verify eligible badges are displayed
4. Test badge minting functionality

### 4.3 Expected Frontend Behavior:
- ✅ Badge eligibility calculated based on XP
- ✅ Mint buttons enabled for eligible badges
- ✅ Transaction confirmation via wallet
- ✅ Badge ownership verification
- ✅ Real-time XP updates

## 🔧 **Step 5: Production Verification**

### 5.1 Contract Verification
```bash
cd hamballer-game-starter/contracts
npx hardhat verify --network abstract-testnet 0x... # XPBadge address
```

### 5.2 Integration Testing
```bash
# Test complete flow
cd hamballer-game-starter/backend
node scripts/test-badge-minting.js test

# Verify in frontend
# 1. Complete a game run
# 2. Check XP increase
# 3. Navigate to badges page
# 4. Mint eligible badges
```

## 📊 **Badge System Overview**

### Default Badges
| Badge ID | Name | XP Required | Description |
|----------|------|-------------|-------------|
| 1 | Novice HODLer | 100 | Complete your first run |
| 2 | Experienced Trader | 500 | Reach 500 XP |
| 3 | Master Strategist | 1000 | Reach 1000 XP |
| 4 | Legendary HODLer | 2500 | Reach 2500 XP |
| 5 | Supreme Champion | 5000 | Reach 5000 XP |

### Contract Functions
- `mintBadge(badgeId, xpRequired)` - Mint a badge
- `getBadgeInfo(badgeId)` - Get badge details
- `getPlayerBadges(player)` - Get player's badges
- `hasPlayerBadge(player, badgeId)` - Check ownership
- `getAvailableBadges(player, playerXP)` - Get eligible badges

## 🚨 **Troubleshooting**

### Common Issues

#### Contract Not Found
```
Error: Contract not found
```
**Solution:** Verify contract deployment and address in `.env`

#### XP Not Updating
```
XP remains at 0
```
**Solution:** Check Supabase configuration and RunCompleted listener

#### Badge Minting Fails
```
Transaction failed
```
**Solution:** Verify XP requirements and wallet signature

#### Frontend Not Loading Badges
```
No badges displayed
```
**Solution:** Check environment variables and contract configuration

### Debug Commands
```bash
# Check contract deployment
cd contracts && npx hardhat run scripts/deploy_xp_badge.js --network abstract-testnet

# Verify environment
cd backend && node -e "console.log(require('./config/environment').config)"

# Test database connection
cd backend && node test-db-connection.js
```

## ✅ **Deployment Checklist**

- [ ] XPBadge contract deployed
- [ ] Contract address added to backend `.env`
- [ ] Contract address added to frontend `.env`
- [ ] Badge minting test passed
- [ ] Frontend badge UI functional
- [ ] Contract verified on block explorer
- [ ] Integration testing completed

## 🎉 **Success Criteria**

The XP Badge system is successfully deployed when:
1. ✅ XPBadge contract is deployed and verified
2. ✅ Badge eligibility is correctly calculated
3. ✅ Badge minting works via frontend
4. ✅ XP progression triggers badge availability
5. ✅ Badge ownership is properly tracked

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Ensure contracts are deployed to the correct network
4. Test with the provided test scripts
5. Check backend logs for error messages

---

**🎮 Ready to mint some badges!** 🏆 