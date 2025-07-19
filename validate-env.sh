#!/bin/bash

# Environment Validation Script for HamBaller.xyz
# This script helps validate your .env configuration

echo "🔍 HamBaller.xyz Environment Validation"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "hamballer-game-starter/.env" ]; then
    echo "❌ Error: Please run this script from the repository root"
    exit 1
fi

echo "✅ Repository structure looks correct"

# Check .env files exist
ENV_FILES=(
    "hamballer-game-starter/.env"
    "hamballer-game-starter/contracts/.env" 
    "hamballer-game-starter/backend/.env"
    "hamballer-game-starter/frontend/.env"
)

echo ""
echo "📁 Checking .env files..."
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Check that .env files are ignored by git
echo ""
echo "🔒 Checking git security..."
if git check-ignore hamballer-game-starter/.env >/dev/null 2>&1; then
    echo "✅ .env files are properly ignored by git"
else
    echo "⚠️  Warning: .env files may not be ignored by git"
fi

# Check for placeholder values that need to be replaced
echo ""
echo "🔑 Checking for placeholders that need to be replaced..."

PLACEHOLDERS_FOUND=0

# Check main .env file
if grep -q "YOUR_PRIVATE_KEY_HERE" hamballer-game-starter/.env; then
    echo "⚠️  hamballer-game-starter/.env: Replace YOUR_PRIVATE_KEY_HERE with your actual private key"
    PLACEHOLDERS_FOUND=1
fi

if grep -q "your_supabase_project_url" hamballer-game-starter/.env; then
    echo "⚠️  hamballer-game-starter/.env: Replace Supabase placeholders if using database features"
fi

# Check contracts .env file  
if grep -q "YOUR_PRIVATE_KEY_HERE" hamballer-game-starter/contracts/.env; then
    echo "⚠️  contracts/.env: Replace YOUR_PRIVATE_KEY_HERE with your actual private key"
    PLACEHOLDERS_FOUND=1
fi

# Check backend .env file
if grep -q "YOUR_PRIVATE_KEY_HERE" hamballer-game-starter/backend/.env; then
    echo "⚠️  backend/.env: Replace YOUR_PRIVATE_KEY_HERE with your actual private key"  
    PLACEHOLDERS_FOUND=1
fi

if grep -q "your_project_id_here" hamballer-game-starter/frontend/.env; then
    echo "⚠️  frontend/.env: Replace WalletConnect project ID if using wallet features"
fi

echo ""
echo "🌐 Wallet Configuration"
echo "Address: 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388"
echo "Network: Abstract Testnet"
echo "Faucet: https://faucet.testnet.abs.xyz"

echo ""
if [ $PLACEHOLDERS_FOUND -eq 1 ]; then
    echo "⚠️  Action Required: Replace private key placeholders before development"
    echo "📖 See ENVIRONMENT_SETUP.md for detailed instructions"
else
    echo "✅ All critical placeholders have been replaced"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Add your private key to the .env files"
echo "2. Get test ETH from the Abstract faucet"
echo "3. Run 'pnpm install:all' in hamballer-game-starter/"
echo "4. Start development with 'pnpm dev:contracts', 'pnpm dev:backend', 'pnpm dev:frontend'"

echo ""
echo "📖 For detailed setup instructions, see: ENVIRONMENT_SETUP.md"