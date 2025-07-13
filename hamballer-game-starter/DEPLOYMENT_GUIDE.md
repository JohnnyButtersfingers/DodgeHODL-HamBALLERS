# 🚀 HamBaller.xyz - MVP Integration Deployment Guide

## 🎯 **Ready to Deploy!**

The complete HamBaller.xyz stack is ready for production deployment. This guide will walk you through deploying all layers of the Web3 DODGE & HODL game.

## 📋 **Pre-Deployment Checklist**

### ✅ **Completed Components**
- 🔗 Smart Contracts (DBP Token, Boost NFT, HODL Manager)
- 🖥️ Backend API (Express + WebSocket + Supabase)
- 📱 Frontend (React + Vite + RainbowKit + Tailwind)
- 🧪 Integration Tests (All systems verified)

### 🛠 **Required Accounts & Services**
- [ ] Abstract testnet wallet with test ETH ([Get ETH](https://faucet.testnet.abs.xyz))
- [ ] Supabase account ([supabase.com](https://supabase.com))
- [ ] Railway/Render account for backend ([railway.app](https://railway.app))
- [ ] Vercel account for frontend ([vercel.com](https://vercel.com))
- [ ] WalletConnect project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com))

## 🚀 **Deployment Process**

### **Step 1: Automated Setup**

Run the automated deployment preparation:

```bash
# From project root
./deploy.sh
```

This script will:
- Install all dependencies
- Run contract tests
- Compile contracts
- Build frontend
- Verify all components

### **Step 2: Deploy Smart Contracts**

```bash
# 1. Configure contracts environment
cd contracts
cp .env.example .env
# Edit .env with your private key and RPC URL

# 2. Deploy to Abstract testnet
npm run deploy:production
```

**Important**: Save the contract addresses output by the deployment script!

### **Step 3: Setup Supabase Database**

1. Create new Supabase project
2. Import schema:
   ```bash
   # Copy contents of backend/database_schema.sql
   # Paste in Supabase SQL Editor and run
   ```
3. Enable Row Level Security (RLS)
4. Copy connection details for backend configuration

### **Step 4: Deploy Backend API**

#### **Option A: Railway**
1. Connect GitHub repo to Railway
2. Set environment variables from `backend/.env.production`:
   ```
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   DBP_TOKEN_ADDRESS=deployed_contract_address
   BOOST_NFT_ADDRESS=deployed_contract_address
   HODL_MANAGER_ADDRESS=deployed_contract_address
   ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
   ```
3. Deploy from `backend` directory

#### **Option B: Render**
1. Connect GitHub repo
2. Configure environment variables
3. Set build command: `npm install`
4. Set start command: `npm start`

### **Step 5: Deploy Frontend**

#### **Vercel Deployment**
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Configure environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_WS_URL=wss://your-backend.railway.app
   VITE_DBP_TOKEN_ADDRESS=deployed_contract_address
   VITE_BOOST_NFT_ADDRESS=deployed_contract_address
   VITE_HODL_MANAGER_ADDRESS=deployed_contract_address
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
   ```
4. Deploy

## 🧪 **Testing Your Deployment**

### **Automated Integration Tests**
```bash
# Run integration test suite
./test-integration.sh
```

### **Manual End-to-End Testing**

1. **🔌 Wallet Connection**
   - Visit your deployed frontend
   - Click "Connect Wallet"
   - Connect to Abstract testnet
   - Verify wallet address displays

2. **🎮 Game Flow**
   - Select 10 moves (UP/DOWN sequence)
   - Click "Start Run"
   - Watch progress visualization
   - Make HODL/CLIMB decision at checkpoint
   - Verify DBP rewards and XP gain

3. **📊 Dashboard & Stats**
   - Navigate to Dashboard
   - Verify player stats display
   - Check run history
   - Test time period filters

4. **🏆 Leaderboard**
   - View global rankings
   - Test sorting options
   - Verify your position highlights

5. **📺 Replay System**
   - Access replay viewer
   - Play back recent runs
   - Test playback controls (play/pause/speed)

6. **📡 Real-time Features**
   - Verify WebSocket "Live" indicator
   - Check DBP price ticker updates
   - Monitor XP changes in real-time

## 🔧 **Configuration Management**

### **Environment Variables**

#### **Frontend (.env.production)**
```bash
VITE_API_URL=https://your-backend-url
VITE_WS_URL=wss://your-backend-url
VITE_DBP_TOKEN_ADDRESS=0x...
VITE_BOOST_NFT_ADDRESS=0x...
VITE_HODL_MANAGER_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=abc123...
```

#### **Backend (.env.production)**
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
DBP_TOKEN_ADDRESS=0x...
BOOST_NFT_ADDRESS=0x...
HODL_MANAGER_ADDRESS=0x...
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
CORS_ORIGIN=https://your-frontend-url
```

#### **Contracts (.env)**
```bash
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
PRIVATE_KEY=0x...
```

### **Contract Address Management**

After deployment, update addresses in:
1. `frontend/src/config/networks.js` (for development)
2. Frontend environment variables (for production)
3. Backend environment variables
4. Update any documentation/README files

## 📊 **Monitoring & Analytics**

### **Health Checks**
- Backend: `https://your-backend-url/health`
- Frontend: Vercel deployment status
- Contracts: Abstract testnet explorer

### **Logging**
- Backend logs via Railway/Render dashboard
- Frontend errors via browser dev tools
- Contract events via Abstract explorer

### **Performance Monitoring**
- API response times
- WebSocket connection stability
- Frontend load times
- Transaction confirmation speeds

## 🔄 **CI/CD Pipeline (Optional)**

Set up automated deployments:

1. **GitHub Actions** for contract tests
2. **Vercel** auto-deployment on frontend changes
3. **Railway** auto-deployment on backend changes
4. **Contract verification** on successful deployment

## 🛠 **Troubleshooting**

### **Common Issues**

#### **Contract Deployment Fails**
- Check test ETH balance in deployer wallet
- Verify Abstract testnet RPC URL
- Confirm private key format

#### **Backend API Errors**
- Check Supabase connection strings
- Verify environment variables
- Review server logs for specific errors

#### **Frontend Build Fails**
- Check all environment variables are set
- Verify contract addresses are valid
- Test API endpoints are accessible

#### **WebSocket Connection Issues**
- Ensure backend WebSocket server is running
- Check CORS configuration
- Verify WSS protocol for HTTPS deployments

### **Debug Commands**

```bash
# Test backend health
curl https://your-backend-url/health

# Test frontend build
cd frontend && npm run build

# Test contract compilation
cd contracts && npm run compile

# Run integration tests
./test-integration.sh
```

## 🎉 **Success Criteria**

Your MVP deployment is successful when:

✅ **Wallet Connection**: Users can connect Abstract testnet wallets  
✅ **Game Flow**: Complete move selection → run → HODL decision → rewards  
✅ **Real-time Updates**: WebSocket shows "Live" and updates in real-time  
✅ **Data Persistence**: Stats, history, and replays save correctly  
✅ **Contract Integration**: DBP tokens and boosts work on-chain  
✅ **Mobile Responsive**: Interface works on mobile devices  
✅ **Performance**: Fast loading and smooth interactions  

## 🚀 **Launch Checklist**

Before going live:

- [ ] All tests passing
- [ ] Contract addresses configured everywhere
- [ ] Database schema imported and configured
- [ ] Environment variables set for all services
- [ ] SSL certificates active (HTTPS/WSS)
- [ ] Domain names configured
- [ ] Monitoring and logging active
- [ ] Backup and recovery procedures tested
- [ ] Security review completed
- [ ] Performance testing under load

## 📞 **Support & Next Steps**

### **Post-Launch Monitoring**
- Monitor user adoption and engagement
- Track transaction success rates
- Analyze game balance and economics
- Gather user feedback for improvements

### **Scaling Considerations**
- Database performance optimization
- CDN for frontend assets
- Redis for session management
- Load balancing for API
- Rate limiting for fair usage

## 🎮 **Ready to Ship!**

Your HamBaller.xyz MVP is **production-ready**! 

**Quick Deploy**: `./deploy.sh`  
**Test Integration**: `./test-integration.sh`  
**Go Live**: Follow deployment steps above  

🚀 **Launch your Web3 DODGE & HODL game!** 🎯💎⚡
