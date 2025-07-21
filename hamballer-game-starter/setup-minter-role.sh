#!/bin/bash

echo "🔧 MINTER_ROLE Setup Script"
echo "=========================="

cd "$(dirname "$0")/contracts"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found in contracts directory"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Current Configuration:"
echo "   XPBadge Address: $XPBADGE_ADDRESS"
echo "   Minter Address: $XPBADGE_MINTER_ADDRESS"
echo ""

# Check for deployer private key
if [ -z "$ABS_WALLET_PRIVATE_KEY" ] && [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Missing deployer private key!"
    echo ""
    echo "🔑 To grant MINTER_ROLE, you need the deployer's private key."
    echo "   Please add one of these to your .env file:"
    echo "   - ABS_WALLET_PRIVATE_KEY=your_deployer_private_key"
    echo "   - PRIVATE_KEY=your_deployer_private_key"
    echo ""
    echo "💡 The deployer is the wallet that deployed the XPBadge contract."
    echo "   This wallet has the DEFAULT_ADMIN_ROLE and can grant MINTER_ROLE."
    echo ""
    echo "📝 Steps:"
    echo "   1. Add your deployer private key to contracts/.env"
    echo "   2. Run this script again"
    echo "   3. The script will grant MINTER_ROLE to the backend minter"
    echo ""
    exit 1
fi

echo "✅ Deployer private key found"
echo "🚀 Running MINTER_ROLE grant script..."

# Run the grant script
npx hardhat run scripts/grant-minter-role.js --network abstract

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MINTER_ROLE granted successfully!"
    echo "🔄 Please restart your backend server to apply changes."
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart backend: cd backend && node index.js"
    echo "   2. Test badge claiming at http://localhost:3000/claim"
    echo "   3. Check backend logs for MINTER_ROLE confirmation"
else
    echo ""
    echo "❌ MINTER_ROLE grant failed!"
    echo "   Check the error message above for details."
    exit 1
fi 