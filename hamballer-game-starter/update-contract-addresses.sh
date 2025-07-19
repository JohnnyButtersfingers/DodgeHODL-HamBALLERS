#!/bin/bash

# Script to help update .env with deployed contract addresses

echo "📝 Contract Address Update Helper"
echo "================================"
echo ""
echo "After deployment, you'll need to update your .env file with the contract addresses."
echo ""
echo "The deployment script will show addresses like:"
echo "  XPBadge deployed to: 0x..."
echo "  XPVerifier deployed to: 0x..."
echo ""
echo "Add these lines to your .env file:"
echo ""
echo "# Deployed Contract Addresses (Abstract Testnet)"
echo "XPBADGE_ADDRESS=<paste_xpbadge_address_here>"
echo "XPVERIFIER_ADDRESS=<paste_xpverifier_address_here>"
echo ""
echo "If you deployed other contracts, also add:"
echo "DBP_TOKEN_ADDRESS=<paste_dbp_token_address_here>"
echo "BOOST_NFT_ADDRESS=<paste_boost_nft_address_here>"
echo "HODL_MANAGER_ADDRESS=<paste_hodl_manager_address_here>"
echo ""
echo "The deployment info is also saved in:"
echo "  contracts/deployments/xp-contracts-abstract.json"
echo ""

# Check if deployment file exists
if [ -f "contracts/deployments/xp-contracts-abstract.json" ]; then
    echo "✅ Found deployment file! Here are your contract addresses:"
    echo ""
    cat contracts/deployments/xp-contracts-abstract.json | grep -A1 "address" | grep -v -- "--"
    echo ""
    echo "Copy these addresses to your .env file!"
else
    echo "ℹ️  No deployment file found yet. Run the deployment first:"
    echo "   cd contracts"
    echo "   npx hardhat run scripts/deploy-xp-contracts.js --network abstract"
fi