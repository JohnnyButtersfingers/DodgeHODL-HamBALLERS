# Phase 9 Deployment Guide - HamBaller.xyz

## Overview

This guide provides step-by-step instructions for deploying Phase 9 of HamBaller.xyz, which includes ZK proof integration, enhanced error handling, and production preparation.

## Prerequisites

### System Requirements
- Node.js 18+ 
- npm or pnpm
- Git
- Access to Abstract Testnet (Chain ID: 11124)
- Private key with testnet tokens

### Required Accounts
- Abstract Testnet wallet with > 0.1 ETH
- GitHub repository access
- Supabase project access

## Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Private keys secured
- [ ] RPC endpoints accessible
- [ ] Testnet tokens available
- [ ] Database migrations ready
- [ ] Frontend builds passing
- [ ] Backend services tested

## Step 1: Environment Setup

### 1.1 Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-org/hamballer-game-starter.git
cd hamballer-game-starter

# Install dependencies
pnpm install
```

### 1.2 Configure Environment Variables

Create `.env` file in project root:

```bash
# Abstract Testnet Configuration
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
ABSTRACT_RPC_FALLBACK=https://rpc.abstract.xyz
ABSTRACT_WALLET_PRIVATE_KEY=your_deployment_private_key

# Contract Addresses (will be populated after deployment)
XP_VERIFIER_ADDRESS=
XP_BADGE_ADDRESS=existing_badge_contract_address

# Backend Configuration
XPVERIFIER_PRIVATE_KEY=backend_service_private_key
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz

# Gas Configuration
GAS_LIMIT=8000000
GAS_PRICE=1000000000
REPORT_GAS=true

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend Configuration
VITE_ABSTRACT_CHAIN_ID=11124
VITE_ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
VITE_XP_VERIFIER_ADDRESS=
```

### 1.3 Verify Configuration

```bash
# Check environment setup
cd contracts
node scripts/verify-private-key.js

# Expected output:
# ✅ Private key configured
# ✅ RPC endpoint accessible
# ✅ Wallet balance: 0.5 ETH
```

## Step 2: Contract Deployment

### 2.1 Deploy XPVerifier Contract

```bash
cd hamballer-game-starter/contracts

# Deploy with gas optimization
npx hardhat run scripts/deploy_xpverifier.js --network abstract
```

**Expected Output:**
```
🚀 Starting XPVerifier deployment on Abstract Testnet...
📋 Deploying contracts with account: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
💰 Account balance: 0.5 ETH
📦 Deploying XPVerifier contract...
⏳ XPVerifier deployment transaction: 0x1234567890abcdef...
✅ XPVerifier deployed successfully!
📍 XPVerifier deployed to: 0xABCDEF1234567890...
🔐 Setting up post-deploy role grants...
✅ MINTER_ROLE granted successfully!
💾 Deployment info saved to: deployments/xpverifier-1234567890.json
✅ Environment variables updated
🔍 Verifying contract on Abstract Explorer...
✅ Contract verified successfully!

🎉 XPVerifier deployment completed successfully!
📍 Contract Address: 0xABCDEF1234567890...
🔗 Explorer: https://explorer.testnet.abs.xyz/address/0xABCDEF1234567890...
```

### 2.2 Update Environment Variables

Copy the deployed contract address to your `.env` file:

```bash
XP_VERIFIER_ADDRESS=0xABCDEF1234567890...
VITE_XP_VERIFIER_ADDRESS=0xABCDEF1234567890...
```

### 2.3 Verify Contract Deployment

```bash
# Check contract on explorer
open https://explorer.testnet.abs.xyz/address/0xABCDEF1234567890...

# Verify contract functions
npx hardhat run scripts/check-roles.js --network abstract
```

## Step 3: Backend Deployment

### 3.1 Update Backend Configuration

```bash
cd hamballer-game-starter/backend

# Update environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 3.2 Test Backend Services

```bash
# Test database connection
npm run test:db

# Test XPVerifier service
npm run test:xpverifier

# Expected output:
# ✅ Database connection successful
# ✅ XPVerifier service initialized
# ✅ RPC fallback configured
```

### 3.3 Deploy Backend

```bash
# For local development
npm run dev

# For production deployment
npm run build
npm start
```

**Expected Output:**
```
✅ Undici fetch overridden globally
✅ Axios configured with 60s timeout and retry logic
🚀 HamBaller.xyz Backend starting...
📊 Database connection established
🔐 XPVerifierService initialized successfully
📍 XPVerifier Contract: 0xABCDEF1234567890...
🔑 Verifier Address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
🎯 Current Threshold: 1000
🌐 Connected to RPC: https://api.testnet.abs.xyz
✅ Backend server running on port 3001
```

## Step 4: Frontend Deployment

### 4.1 Build Frontend

```bash
cd hamballer-game-starter/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

**Expected Output:**
```
✅ Vite build completed
📦 Bundle size: 2.1 MB
⚡ Build time: 45s
```

### 4.2 Test Frontend Integration

```bash
# Run tests
npm run test

# Expected output:
# ✅ ZK Integration Validation Suite
# ✅ Nullifier Uniqueness Tests
# ✅ Gas Profiling Tests
# ✅ Replay Prevention Tests
# ✅ All tests passing
```

### 4.3 Deploy Frontend

```bash
# For local development
npm run dev

# For production (example with Vercel)
vercel --prod
```

## Step 5: ZK Integration Testing

### 5.1 Run Comprehensive Test Suite

```bash
cd hamballer-game-starter/contracts

# Run ZK integration tests
./scripts/test-zk-integration.sh
```

**Expected Output:**
```
🧪 Starting ZK Integration Testing Suite
==================================================
📁 Script Directory: /workspace/contracts/scripts
📁 Contracts Directory: /workspace/contracts
📁 Test Results: /workspace/contracts/test-results
📁 Proofs Directory: /workspace/contracts/proofs

🔍 Running Pre-flight Checks
----------------------------------------
✅ Node.js Installation: PASS - Version: v18.17.0
✅ Package Manager: PASS - pnpm version: 8.6.0
✅ Hardhat Installation: PASS - Hardhat found in node_modules
✅ Environment File: PASS - .env file found

🧪 Test 1: ZK Proof Generator Basic Functionality
--------------------------------------------------------
✅ ZK Proof Generator: PASS - Basic functionality test completed

🧪 Test 2: Nullifier Uniqueness and Replay Prevention
--------------------------------------------------------------
✅ Nullifier Uniqueness: PASS - No collisions detected in 100 attempts

🧪 Test 3: Gas Profiling for verifyProof
-----------------------------------------------
✅ Gas Profiling: PASS - verifyProof gas usage within 320k limit

🧪 Test 4: Edge Cases and Error Handling
-----------------------------------------------
✅ Edge Cases: PASS - All edge cases handled correctly

🧪 Test 5: Performance and Load Testing
----------------------------------------------
✅ Performance: PASS - Performance test completed successfully

🧹 Cleaning up test files
--------------------------------
✅ Test files cleaned up

📊 Test Summary
==================
Test Results Log: /workspace/contracts/test-results/zk-test-results.log

Recent Test Results:
[2024-01-15 10:30:15] PASS: ZK Proof Generator - Basic functionality test completed
[2024-01-15 10:30:18] PASS: Nullifier Uniqueness - No collisions detected in 100 attempts
[2024-01-15 10:30:22] PASS: Gas Profiling - verifyProof gas usage within 320k limit
[2024-01-15 10:30:25] PASS: Edge Cases - All edge cases handled correctly
[2024-01-15 10:30:28] PASS: Performance - Performance test completed successfully

🎉 ZK Integration Testing Suite Completed
==================================================
📁 Test results saved in: /workspace/contracts/test-results
📁 Proofs saved in: /workspace/contracts/proofs
```

### 5.2 Manual Testing

```bash
# Test proof generation
node scripts/zkProofGenerator.js

# Expected output:
# 🧪 Testing ZK Proof Generator...
# ✅ Single proof generation test passed
# ✅ Proof verification test: PASSED
# ✅ Nullifier uniqueness test: PASSED
# ✅ Batch proof generation test: PASSED
# 📊 Proof Statistics: { totalProofs: 4, totalNullifiers: 4, ... }
# 🎉 ZK Proof Generator tests completed
```

## Step 6: Production Preparation

### 6.1 Gas Profiling

```bash
# Enable gas reporting
REPORT_GAS=true npx hardhat test

# Expected output:
# ⛽ Gas Report
# · XPVerifier.verifyXPProof · 156,234 · 156,234 · 156,234
# ✅ Gas usage within 320k limit
```

### 6.2 Security Audit

```bash
# Run security checks
npm audit

# Expected output:
# ✅ No vulnerabilities found
# ✅ All dependencies up to date
```

### 6.3 Performance Testing

```bash
# Load test the system
npm run test:load

# Expected output:
# ✅ Average response time: 245ms
# ✅ 99th percentile: 890ms
# ✅ Error rate: 0.1%
# ✅ Throughput: 150 req/s
```

## Step 7: Monitoring Setup

### 7.1 Log Monitoring

```bash
# Check logs for errors
tail -f logs/application.log | grep -E "(ERROR|WARN)"

# Expected output:
# [INFO] System running normally
# [INFO] ZK proof generation successful
```

### 7.2 Health Checks

```bash
# Test health endpoints
curl http://localhost:3001/health

# Expected output:
# {
#   "status": "healthy",
#   "services": {
#     "database": "connected",
#     "xpverifier": "initialized",
#     "rpc": "connected"
#   },
#   "timestamp": "2024-01-15T10:30:00Z"
# }
```

## Step 8: Documentation

### 8.1 Update Documentation

```bash
# Generate deployment report
cat > DEPLOYMENT_REPORT.md << EOF
# Phase 9 Deployment Report

## Deployment Summary
- **Date**: $(date)
- **Environment**: Abstract Testnet
- **Chain ID**: 11124
- **Status**: ✅ Successful

## Contract Addresses
- **XPVerifier**: 0xABCDEF1234567890...
- **XPBadge**: 0xEXISTINGBADGEADDRESS...

## Test Results
- **ZK Integration**: ✅ PASS
- **Gas Profiling**: ✅ PASS (< 320k gas)
- **Error Handling**: ✅ PASS
- **Performance**: ✅ PASS

## Next Steps
1. Monitor system performance
2. Test user flows
3. Prepare for mainnet deployment
EOF
```

### 8.2 Create Handoff Documentation

```bash
# Generate handoff guide
cat > HANDOFF_GUIDE.md << EOF
# Phase 9 Handoff Guide

## System Status
- ✅ Contracts deployed and verified
- ✅ Backend services running
- ✅ Frontend deployed and tested
- ✅ ZK integration functional
- ✅ Monitoring configured

## Access Information
- **Frontend**: https://hamballer.xyz
- **Backend**: https://api.hamballer.xyz
- **Explorer**: https://explorer.testnet.abs.xyz
- **Documentation**: /ZK_INTEGRATION_README.md

## Contact Information
- **Dev Team**: dev@hamballer.xyz
- **Support**: support@hamballer.xyz
- **Emergency**: emergency@hamballer.xyz

## Maintenance Tasks
- Monitor gas usage
- Check error rates
- Update dependencies
- Backup database
EOF
```

## Troubleshooting

### Common Issues

#### 1. RPC Timeout (522 Error)
```bash
# Check RPC status
curl -X POST https://api.testnet.abs.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Use fallback RPC
export ABSTRACT_RPC_URL=https://rpc.abstract.xyz
```

#### 2. Gas Estimation Failed
```bash
# Set explicit gas limit
npx hardhat run scripts/deploy_xpverifier.js --network abstract \
  --gas-limit 8000000
```

#### 3. Contract Verification Failed
```bash
# Manual verification
npx hardhat verify --network abstract 0xCONTRACT_ADDRESS

# Check constructor arguments
npx hardhat run scripts/verify-constructor-args.js
```

#### 4. Backend Connection Issues
```bash
# Check database connection
npm run test:db

# Check RPC connection
npm run test:rpc

# Restart services
pm2 restart all
```

### Emergency Procedures

#### Rollback Plan
```bash
# 1. Stop services
pm2 stop all

# 2. Revert to previous deployment
git checkout previous-commit

# 3. Restart services
pm2 start all

# 4. Verify functionality
npm run test:all
```

#### Data Recovery
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

## Post-Deployment Checklist

- [ ] All services running
- [ ] Contract addresses updated
- [ ] Environment variables configured
- [ ] Tests passing
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team notified
- [ ] Backup completed
- [ ] Security audit passed
- [ ] Performance benchmarks met

## Success Metrics

### Technical Metrics
- ✅ Gas usage < 320k per verification
- ✅ Proof generation < 5s
- ✅ Error rate < 1%
- ✅ Uptime > 99.9%

### User Experience Metrics
- ✅ Badge claiming success rate > 95%
- ✅ Average claim time < 30s
- ✅ User satisfaction > 4.5/5

## Next Phase Preparation

### Mainnet Deployment
- [ ] Multi-party trusted setup
- [ ] Security audit completion
- [ ] Gas optimization finalization
- [ ] Cross-chain integration testing

### Feature Enhancements
- [ ] Advanced ZK circuits
- [ ] Batch processing optimization
- [ ] Enhanced privacy features
- [ ] Cross-chain compatibility

## Support and Maintenance

### Regular Maintenance
- Daily: Check logs and error rates
- Weekly: Update dependencies
- Monthly: Performance review
- Quarterly: Security audit

### Emergency Contacts
- **Technical Lead**: tech@hamballer.xyz
- **DevOps**: devops@hamballer.xyz
- **Security**: security@hamballer.xyz

---

**Deployment completed successfully on $(date)**

**Phase 9 Status: ✅ PRODUCTION READY**