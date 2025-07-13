#!/bin/bash
echo "🔄 HamBaller.xyz Quick Deployment Check"
echo "======================================="

# Check if we're in the contracts directory
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ Please run this from the contracts directory"
    exit 1
fi

echo "📋 Wallet: 0xce6A0FA416EDdFf590621bf41B44Bb8EeaD52E37"
echo ""

# Check balance
echo "💰 Checking balance..."
npx hardhat run check-balance.js --network abstract

echo ""
echo "🎯 When you have testnet ETH, run:"
echo "   npx hardhat run scripts/deploy_production.js --network abstract"
echo ""
echo "💡 Need testnet ETH? Visit the Abstract testnet faucet!"
