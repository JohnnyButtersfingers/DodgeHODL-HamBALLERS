#!/bin/bash

# HamBaller.xyz Integrated MVP Deployment Script
# This script automates the entire deployment pipeline

set -e  # Exit on any error

echo "🚀 HamBaller.xyz MVP Integration Deployment"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "contracts" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check for required tools
command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; exit 1; }

print_step "Phase 1: Installing Dependencies"
npm install
print_success "Dependencies installed"

print_step "Phase 2: Running Tests"
cd contracts
npm test
if [ $? -ne 0 ]; then
    print_error "Contract tests failed"
    exit 1
fi
cd ..
print_success "All tests passed"

print_step "Phase 3: Contract Compilation"
cd contracts
npm run compile
print_success "Contracts compiled successfully"

print_step "Phase 4: Contract Deployment Check"
if [ ! -f ".env" ]; then
    print_warning "No .env file found in contracts directory"
    print_warning "Please copy .env.example to .env and configure:"
    print_warning "- ABSTRACT_TESTNET_RPC_URL"
    print_warning "- PRIVATE_KEY (with test ETH)"
    echo ""
    print_warning "Get test ETH from: https://faucet.testnet.abs.xyz"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

print_step "Phase 5: Deploy Contracts (Manual Step)"
echo "Run the following command to deploy contracts:"
echo ""
echo -e "${YELLOW}cd contracts && npm run deploy:production${NC}"
echo ""
print_warning "After deployment, update contract addresses in:"
print_warning "- frontend/.env.production"
print_warning "- backend/.env.production"
echo ""
read -p "Press Enter after contracts are deployed and addresses are updated..."

cd ..

print_step "Phase 6: Backend Build Check"
cd backend
if [ ! -f ".env" ]; then
    print_warning "No backend .env file found"
    print_warning "Please configure backend/.env with Supabase credentials"
    read -p "Press Enter when ready to continue..."
fi

# Test backend build
npm install
print_success "Backend dependencies installed"

cd ..

print_step "Phase 7: Frontend Build"
cd frontend
npm install

# Build frontend
npm run build
if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi
print_success "Frontend built successfully"

cd ..

print_step "Phase 8: Deployment Instructions"
echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "Next steps for deployment:"
echo ""
echo "📱 Frontend (Vercel):"
echo "1. Connect GitHub repo to Vercel"
echo "2. Set environment variables from frontend/.env.production"
echo "3. Deploy from 'frontend' directory"
echo ""
echo "🖥️ Backend (Railway/Render):"
echo "1. Connect GitHub repo to Railway"
echo "2. Set environment variables from backend/.env.production"
echo "3. Deploy from 'backend' directory"
echo ""
echo "🗄️ Database (Supabase):"
echo "1. Import schema from backend/database_schema.sql"
echo "2. Enable Row Level Security"
echo "3. Update connection strings in backend env"
echo ""
echo "🔗 Contract Integration:"
echo "1. Verify contract addresses are updated in all env files"
echo "2. Test wallet connection and contract interactions"
echo ""

print_success "MVP Integration ready for deployment!"

echo ""
echo "🧪 Testing Checklist:"
echo "□ Wallet connect works"
echo "□ Move selection and run execution"
echo "□ HODL/CLIMB decision flow"
echo "□ XP and stats update correctly"
echo "□ Replay viewer shows data"
echo "□ Leaderboard displays rankings"
echo "□ WebSocket real-time updates"
echo ""

print_success "Deploy script completed! 🚀"
