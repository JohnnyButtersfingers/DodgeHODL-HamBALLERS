#!/bin/bash

# 🏆 XP Badge Deployment Script
# This script guides you through deploying the XP Badge system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${BLUE}🎯 Step $1: $2${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the hamballer-game-starter directory"
    exit 1
fi

echo "🏆 XP Badge System Deployment"
echo "=============================="
echo ""

# Step 1: Environment Setup
print_step "1" "Setting up environment files"

if [ ! -f "contracts/.env" ]; then
    print_warning "No contracts/.env file found"
    print_info "Creating contracts/.env from template..."
    cp contracts/env-template.txt contracts/.env
    print_warning "Please edit contracts/.env and add your private key:"
    print_info "1. Open contracts/.env"
    print_info "2. Replace 'your_actual_private_key_here' with your actual private key"
    print_info "3. Save the file"
    echo ""
    read -p "Press Enter when you've configured contracts/.env..."
else
    print_success "contracts/.env already exists"
fi

# Step 2: Check private key
print_step "2" "Verifying private key configuration"

if grep -q "your_actual_private_key_here" contracts/.env; then
    print_error "Private key not configured in contracts/.env"
    print_info "Please edit contracts/.env and add your actual private key"
    exit 1
fi

print_success "Private key configured"

# Step 3: Deploy XPBadge contract
print_step "3" "Deploying XPBadge contract"

cd contracts

print_info "Compiling contracts..."
npm run compile

print_info "Deploying XPBadge to Abstract testnet..."
XP_BADGE_ADDRESS=$(npm run deploy:xp-badge 2>&1 | grep "XPBadge deployed to:" | awk '{print $4}')

if [ -z "$XP_BADGE_ADDRESS" ]; then
    print_error "Failed to deploy XPBadge contract"
    print_info "Check the deployment output above for errors"
    exit 1
fi

print_success "XPBadge deployed to: $XP_BADGE_ADDRESS"

cd ..

# Step 4: Configure backend
print_step "4" "Configuring backend environment"

if [ ! -f "backend/.env" ]; then
    print_warning "No backend/.env file found"
    print_info "Creating backend/.env from template..."
    cp backend/env-template.txt backend/.env
fi

# Update XP_BADGE_ADDRESS in backend/.env
if grep -q "XP_BADGE_ADDRESS" backend/.env; then
    sed -i.bak "s/XP_BADGE_ADDRESS=.*/XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS/" backend/.env
else
    echo "XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS" >> backend/.env
fi

print_success "Backend configured with XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS"

# Step 5: Configure frontend
print_step "5" "Configuring frontend environment"

if [ ! -f "frontend/.env" ]; then
    print_warning "No frontend/.env file found"
    print_info "Creating frontend/.env from template..."
    cp frontend/env-template.txt frontend/.env
fi

# Update VITE_XP_BADGE_ADDRESS in frontend/.env
if grep -q "VITE_XP_BADGE_ADDRESS" frontend/.env; then
    sed -i.bak "s/VITE_XP_BADGE_ADDRESS=.*/VITE_XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS/" frontend/.env
else
    echo "VITE_XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS" >> frontend/.env
fi

print_success "Frontend configured with VITE_XP_BADGE_ADDRESS=$XP_BADGE_ADDRESS"

# Step 6: Test badge system
print_step "6" "Testing badge system"

cd backend

print_info "Testing badge minting functionality..."
if node scripts/test-badge-minting.js test; then
    print_success "Badge minting test passed"
else
    print_warning "Badge minting test failed - this is expected if backend is not fully configured"
fi

cd ..

# Step 7: Summary
print_step "7" "Deployment Summary"

echo ""
echo "🎉 XP Badge System Deployment Complete!"
echo "======================================"
echo ""
echo "📋 Deployment Summary:"
echo "• XPBadge Contract: $XP_BADGE_ADDRESS"
echo "• Network: Abstract Testnet"
echo "• Backend: Configured with XP_BADGE_ADDRESS"
echo "• Frontend: Configured with VITE_XP_BADGE_ADDRESS"
echo ""
echo "📝 Next Steps:"
echo "1. Test frontend integration:"
echo "   cd frontend && npm run dev"
echo "2. Navigate to /badges in your browser"
echo "3. Connect wallet and test badge minting"
echo "4. Complete a game run to earn XP"
echo "5. Verify badge eligibility and minting"
echo ""
echo "🔗 Useful Links:"
echo "• Contract Explorer: https://explorer.testnet.abs.xyz/address/$XP_BADGE_ADDRESS"
echo "• Testnet Faucet: https://faucet.testnet.abs.xyz"
echo ""

print_success "XP Badge system is ready for testing!" 