# 🚀 XP Badge System Deployment Checklist

## ✅ **Pre-Deployment Setup**

### 1. Environment Configuration
- [ ] Create `contracts/.env` from `contracts/.env.example`
- [ ] Add your private key to `contracts/.env`
- [ ] Get test ETH from https://faucet.testnet.abs.xyz
- [ ] Verify RPC URL is correct: `https://api.testnet.abs.xyz`

### 2. Contract Verification
- [ ] XPBadge contract compiled successfully ✅
- [ ] All dependencies installed ✅
- [ ] Hardhat configuration ready ✅

## 🎯 **Deployment Steps**

### Step 1: Deploy XPBadge Contract
```bash
cd hamballer-game-starter/contracts
npm run deploy:xp-badge
```

**Expected Output:**
```
🏆 Deploying XPBadge contract...
✅ XPBadge deployed to: 0x... (your address)
📊 Total badges created: 5
🎖️ Badge 1: Novice HODLer (100 XP)
🎖️ Badge 2: Experienced Trader (500 XP)
🎖️ Badge 3: Master Strategist (1000 XP)
🎖️ Badge 4: Legendary HODLer (2500 XP)
🎖️ Badge 5: Supreme Champion (5000 XP)
```

### Step 2: Configure Environment Variables

#### Backend Configuration
Add to `backend/.env`:
```env
# XP Badge Contract
XP_BADGE_ADDRESS=0x... # Your deployed address
```

#### Frontend Configuration
Add to `frontend/.env`:
```env
# XP Badge Contract
VITE_XP_BADGE_ADDRESS=0x... # Your deployed address
```

## 🧪 **Testing Steps**

### Step 3: Test Badge System
```bash
cd hamballer-game-starter/backend
node scripts/test-badge-minting.js test
```

**Expected Test Results:**
- ✅ XP progression simulation
- ✅ Badge eligibility calculation
- ✅ Mock event emission
- ✅ Contract interaction (if configured)

### Step 4: Test Frontend Integration
```bash
cd hamballer-game-starter/frontend
npm run dev
```

**Frontend Testing:**
- [ ] Navigate to `/badges`
- [ ] Connect wallet
- [ ] Verify badge eligibility display
- [ ] Test badge minting functionality
- [ ] Check real-time XP updates

## 🔧 **Verification Steps**

### Step 5: Contract Verification (Optional)
```bash
cd hamballer-game-starter/contracts
npx hardhat verify --network abstract 0x... # Your XPBadge address
```

### Step 6: Integration Testing
- [ ] Complete a game run
- [ ] Check XP increase in database
- [ ] Navigate to badges page
- [ ] Mint eligible badges
- [ ] Verify badge ownership

## 📊 **Success Criteria**

The XP Badge system is successfully deployed when:
- [ ] XPBadge contract deployed and verified
- [ ] Environment variables configured
- [ ] Badge minting test passed
- [ ] Frontend badge UI functional
- [ ] XP progression triggers badge availability
- [ ] Badge ownership properly tracked

## 🚨 **Troubleshooting**

### Common Issues

#### Private Key Error
```
Error: factory runner does not support sending transactions
```
**Solution:** Add private key to `contracts/.env`

#### Network Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Check RPC URL and internet connection

#### Insufficient Balance
```
Error: insufficient funds
```
**Solution:** Get test ETH from faucet

#### Contract Not Found
```
Error: Contract not found
```
**Solution:** Verify contract deployment and address

## 🎉 **Post-Deployment**

### What You'll Have:
- ✅ 5 achievement badges (100 XP → 5000 XP)
- ✅ Real-time XP progression tracking
- ✅ Automatic badge eligibility calculation
- ✅ Secure badge minting via frontend
- ✅ Beautiful UI with animations
- ✅ Mobile wallet support

### Next Phase Options:
1. **Add ZK-proof verification** for enhanced security
2. **Implement admin routes** for threshold management
3. **Add more badge types** (event badges, special achievements)
4. **Create badge marketplace** for trading

---

**🎮 Ready to deploy! Follow the steps above and let me know if you need help!** 🏆 