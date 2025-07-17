# HamBaller.xyz Deployment Guide

## 🚀 Deployment Overview

This guide covers the complete deployment process for the HamBaller.xyz application after resolving merge conflicts and build issues.

## ✅ Pre-Deployment Checklist

### Code Status
- [x] Merge conflicts resolved
- [x] Frontend build passing
- [x] Backend startup successful
- [x] Import inconsistencies fixed
- [x] JSX syntax errors resolved

### Build Verification
```bash
# Frontend build test
cd frontend && npm install && npm run build

# Backend startup test
cd backend && npm install && npm start
```

## 🏗️ Deployment Options

### Option 1: Vercel (Recommended for Frontend)

#### Frontend Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel --prod

# Environment variables needed:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_WALLETCONNECT_PROJECT_ID
# - VITE_ABSTRACT_RPC_URL
# - VITE_HODL_MANAGER_ADDRESS
# - VITE_DBP_TOKEN_ADDRESS
# - VITE_XPBADGE_ADDRESS
```

#### Backend Deployment (Vercel Serverless)
```bash
# Deploy from backend directory
cd backend
vercel --prod

# Environment variables needed:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - ABSTRACT_RPC_URL
# - HODL_MANAGER_ADDRESS
# - XPBADGE_ADDRESS
# - XPBADGE_MINTER_PRIVATE_KEY
# - NODE_ENV=production
```

### Option 2: Abstract Testnet (Web3 Native)

#### Deploy Smart Contracts First
```bash
# From contracts directory
npm install
npm run deploy:abstract-testnet

# Note contract addresses for frontend configuration
```

#### Deploy Application
```bash
# Frontend on Abstract
cd frontend
npm run build
# Deploy dist/ to Abstract hosting

# Backend on Abstract infrastructure
cd backend
# Deploy to Abstract compute resources
```

### Option 3: Traditional VPS/Cloud

#### Frontend (Static Hosting)
```bash
cd frontend
npm run build
# Upload dist/ to your hosting provider
# Configure environment variables
```

#### Backend (Node.js Server)
```bash
cd backend
npm install --production
# Set up environment variables
# Configure process manager (PM2 recommended)
npm install -g pm2
pm2 start index.js --name hamballer-backend
```

## 🔧 Environment Configuration

### Frontend Environment Variables (.env)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Blockchain Configuration
VITE_ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
VITE_HODL_MANAGER_ADDRESS=0x...
VITE_DBP_TOKEN_ADDRESS=0x...
VITE_XPBADGE_ADDRESS=0x...

# API Configuration
VITE_API_BASE_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com/socket
```

### Backend Environment Variables (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Blockchain Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
HODL_MANAGER_ADDRESS=0x...
XPBADGE_ADDRESS=0x...
XPBADGE_MINTER_PRIVATE_KEY=0x...

# Security Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🧪 Testing Strategy

### 1. Frontend Testing

#### Unit Tests
```bash
cd frontend
npm run test
```

#### Build Test
```bash
cd frontend
npm run build
npm run preview
```

#### Manual Testing Checklist
- [ ] Wallet connection (MetaMask, WalletConnect)
- [ ] Navigation responsiveness (mobile/desktop)
- [ ] Leaderboard data loading
- [ ] Game state transitions
- [ ] XP overlay animations
- [ ] Error handling displays

### 2. Backend Testing

#### API Endpoint Testing
```bash
cd backend
npm install -g newman
# Test API endpoints
curl -X GET http://localhost:3001/api/health
curl -X GET http://localhost:3001/api/dashboard/leaderboard
```

#### WebSocket Testing
```bash
# Test WebSocket connections
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/socket');
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data.toString()));
"
```

### 3. Integration Testing

#### Database Connectivity
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('run_logs').select('*').limit(1).then(console.log);
"
```

#### Blockchain Integration
```bash
# Test contract connectivity
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL);
provider.getBlockNumber().then(block => console.log('Latest block:', block));
"
```

### 4. End-to-End Testing

#### Cypress Tests (Recommended)
```bash
cd frontend
npm install --save-dev cypress
npx cypress open
```

#### Test Scenarios
1. **User Journey**: Connect wallet → Start game → Complete run → View leaderboard
2. **Responsive Design**: Test on mobile, tablet, desktop viewports
3. **Error Handling**: Test network failures, wallet disconnection
4. **Real-time Features**: Test WebSocket connectivity and live updates

## 📊 Monitoring and Observability

### Frontend Monitoring
```javascript
// Add to main.jsx
import { analytics } from './utils/analytics';

// Track user interactions
analytics.track('game_started', { wallet: address });
analytics.track('run_completed', { score, xp });
```

### Backend Monitoring
```javascript
// Add to index.js
const prometheus = require('prom-client');

// Track API performance
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route', 'method', 'status']
});
```

### Health Checks
```bash
# Frontend health check
curl -f https://your-frontend.vercel.app/ || exit 1

# Backend health check
curl -f https://your-backend.vercel.app/api/health || exit 1

# Database health check
curl -f https://your-backend.vercel.app/api/health/database || exit 1
```

## 🔒 Security Considerations

### Frontend Security
- Environment variables validation
- Input sanitization
- XSS prevention
- CSP headers configuration

### Backend Security
- Rate limiting implementation
- CORS configuration
- Input validation with Joi
- Private key security (use environment variables)

### Smart Contract Security
- Contract address verification
- Transaction signing validation
- Gas limit protection
- Reentrancy guards

## 📚 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist/
npm run build
```

#### WebSocket Connection Issues
```javascript
// Check CORS configuration
// Verify WebSocket URL format
// Test firewall settings
```

#### Database Connection Problems
```bash
# Verify Supabase credentials
# Check network connectivity
# Validate environment variables
```

### Debug Commands
```bash
# Frontend debug mode
npm run dev -- --debug

# Backend verbose logging
DEBUG=* npm start

# Network diagnostics
netstat -tulpn | grep :3001
```

## 📈 Performance Optimization

### Frontend Optimization
- Code splitting implementation
- Bundle size analysis
- Image optimization
- CDN configuration

### Backend Optimization
- Database query optimization
- Caching strategies
- Connection pooling
- Load balancing

## 🚢 Deployment Automation

### GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy HamBaller

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Test Frontend
        run: cd frontend && npm install && npm run build
      - name: Test Backend
        run: cd backend && npm install && npm test
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 📝 Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Database queries work
- [ ] Wallet connections function
- [ ] WebSocket updates work
- [ ] Mobile responsiveness verified
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Security headers configured
- [ ] SSL certificates valid

## 🎯 Next Steps

1. **Set up monitoring dashboards**
2. **Implement comprehensive testing**
3. **Configure automated deployments**
4. **Set up error tracking**
5. **Plan scaling strategies**

---

## 📞 Support

For deployment issues or questions:
- Check GitHub Issues
- Review error logs
- Test in staging environment first
- Contact the development team

**Happy Deploying! 🚀**