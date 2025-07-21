#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Verifying Deployment Readiness for Abstract Testnet${NC}\n"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "   Please ensure you're in the hamballer-game-starter directory"
    exit 1
fi

# Check if private key is set (without showing it)
if grep -q "ABS_WALLET_PRIVATE_KEY=your_private_key_here_do_not_share" .env; then
    echo -e "${RED}❌ Private key not updated!${NC}"
    echo "   Please update ABS_WALLET_PRIVATE_KEY in .env with your actual private key"
    exit 1
else
    echo -e "${GREEN}✓ Private key appears to be set${NC}"
fi

# Check other required variables
echo -e "\n${YELLOW}Checking other environment variables:${NC}"

if grep -q "TESTNET_RPC_URL=https://rpc.abstract.xyz" .env; then
    echo -e "${GREEN}✓ RPC URL configured${NC}"
else
    echo -e "${RED}❌ RPC URL not properly configured${NC}"
fi

if grep -q "ABS_WALLET_ADDRESS=0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388" .env; then
    echo -e "${GREEN}✓ Wallet address configured${NC}"
else
    echo -e "${YELLOW}⚠️  Wallet address modified (make sure it matches your private key)${NC}"
fi

# Check if in contracts directory
echo -e "\n${YELLOW}Checking directory structure:${NC}"
if [ -d "contracts" ]; then
    echo -e "${GREEN}✓ Contracts directory found${NC}"
    
    # Check for deployment scripts
    if [ -f "contracts/scripts/test-wallet-config.js" ]; then
        echo -e "${GREEN}✓ Wallet test script found${NC}"
    else
        echo -e "${RED}❌ Wallet test script not found${NC}"
    fi
    
    if [ -f "contracts/scripts/deploy-xp-contracts.js" ]; then
        echo -e "${GREEN}✓ XP contracts deployment script found${NC}"
    else
        echo -e "${RED}❌ XP contracts deployment script not found${NC}"
    fi
else
    echo -e "${RED}❌ Contracts directory not found${NC}"
fi

echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo "1. Run wallet configuration test:"
echo "   cd contracts"
echo "   npx hardhat run scripts/test-wallet-config.js --network abstract"
echo ""
echo "2. If wallet has no balance, get testnet ETH from:"
echo "   https://faucet.testnet.abs.xyz"
echo ""
echo "3. Deploy contracts:"
echo "   npx hardhat run scripts/deploy-xp-contracts.js --network abstract"
echo ""
echo "4. Update .env with deployed contract addresses"

echo -e "\n${GREEN}✅ Verification complete!${NC}"