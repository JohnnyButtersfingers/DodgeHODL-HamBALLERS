# 🏆 XP Badge System - Quick Start Guide

## 🚀 **Ready to Deploy!**

Your XP Badge system is fully developed and ready for deployment. Here's how to get it running:

## 📋 **Prerequisites**

1. **Private Key**: You need a wallet private key for deployment
2. **Test ETH**: Get test ETH from https://faucet.testnet.abs.xyz
3. **Node.js**: Make sure you have Node.js installed

## 🎯 **Deployment Steps**

### **Option 1: Automated Deployment (Recommended)**

Run the automated deployment script:

```bash
cd hamballer-game-starter
./deploy-xp-badge.sh
```

This script will:
- ✅ Create environment files from templates
- ✅ Guide you through private key configuration
- ✅ Deploy the XPBadge contract
- ✅ Configure backend and frontend
- ✅ Run initial tests

### **Option 2: Manual Deployment**

If you prefer manual control, follow these steps:

#### **Step 1: Set Up Environment**

```bash
cd hamballer-game-starter/contracts
cp env-template.txt .env
```

Edit `contracts/.env` and add your private key:
```env
PRIVATE_KEY=your_actual_private_key_here
```

#### **Step 2: Deploy Contract**

```bash
cd hamballer-game-starter/contracts
npm run deploy:xp-badge
```

#### **Step 3: Configure Backend**

```bash
cd hamballer-game-starter/backend
cp env-template.txt .env
```

Add the deployed contract address to `backend/.env`:
```env
XP_BADGE_ADDRESS=0x... # Your deployed address
```

#### **Step 4: Configure Frontend**

```bash
cd hamballer-game-starter/frontend
cp env-template.txt .env
```

Add the deployed contract address to `frontend/.env`:
```env
VITE_XP_BADGE_ADDRESS=0x... # Your deployed address
```

## 🧪 **Testing**

### **Test Badge System**

```bash
cd hamballer-game-starter/backend
node scripts/test-badge-minting.js test
```

### **Test Frontend**

```bash
cd hamballer-game-starter/frontend
npm run dev
```

Navigate to `http://localhost:5173/badges` and test:
- ✅ Connect wallet
- ✅ View badge eligibility
- ✅ Mint badges (if you have sufficient XP)

## 🎮 **What You'll Get**

After deployment, you'll have:

- **5 Achievement Badges**:
  - 🥉 Novice HODLer (100 XP)
  - 🥈 Experienced Trader (500 XP)
  - 🥇 Master Strategist (1000 XP)
  - 👑 Legendary HODLer (2500 XP)
  - 🏆 Supreme Champion (5000 XP)

- **Features**:
  - ✅ Real-time XP tracking
  - ✅ Automatic badge eligibility
  - ✅ Secure badge minting
  - ✅ Beautiful UI with animations
  - ✅ Mobile wallet support
  - ✅ ERC-1155 standard compliance

## 🔗 **Useful Links**

- **Contract Explorer**: https://explorer.testnet.abs.xyz
- **Testnet Faucet**: https://faucet.testnet.abs.xyz
- **Documentation**: See `DEPLOYMENT_CHECKLIST.md` for detailed steps

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Private Key Error**: Make sure your private key is correctly set in `contracts/.env`
2. **Insufficient Balance**: Get test ETH from the faucet
3. **Network Issues**: Check your internet connection and RPC URL

### **Need Help?**

- Check the detailed `DEPLOYMENT_CHECKLIST.md`
- Review `XP_BADGE_DEPLOYMENT.md` for technical details
- See `XP_BADGE_STATUS.md` for current system status

---

**🎉 Ready to deploy? Run `./deploy-xp-badge.sh` and follow the prompts!** 🏆 