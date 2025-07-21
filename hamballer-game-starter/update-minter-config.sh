#!/bin/bash

echo "🔧 Updating Backend Minter Configuration..."

# Navigate to the correct directory
cd "$(dirname "$0")"

# Update backend .env file with the generated minter wallet
echo "📝 Updating backend .env file with minter wallet..."
sed -i '' 's/XPBADGE_MINTER_PRIVATE_KEY=your_minter_private_key_here_do_not_share/XPBADGE_MINTER_PRIVATE_KEY=0xc67a0fe16ca6143604478ea3034427175b4c191b0bea6335ade9bb5922ed86a7/' backend/.env
sed -i '' 's/XPBADGE_MINTER_ADDRESS=your_minter_address_here/XPBADGE_MINTER_ADDRESS=0x8a65F34eDb8Dd15D5824a54ef15082f3Fd249B36/' backend/.env

# Update main .env file
echo "📝 Updating main .env file with minter wallet..."
sed -i '' 's/XPBADGE_MINTER_PRIVATE_KEY=your_minter_private_key_here_do_not_share/XPBADGE_MINTER_PRIVATE_KEY=0xc67a0fe16ca6143604478ea3034427175b4c191b0bea6335ade9bb5922ed86a7/' .env
sed -i '' 's/XPBADGE_MINTER_ADDRESS=your_minter_address_here/XPBADGE_MINTER_ADDRESS=0x8a65F34eDb8Dd15D5824a54ef15082f3Fd249B36/' .env

echo "✅ Minter configuration updated!"
echo ""
echo "🔑 Backend Minter Wallet:"
echo "   Address: 0x8a65F34eDb8Dd15D5824a54ef15082f3Fd249B36"
echo "   Private Key: 0xc67a0fe16ca6143604478ea3034427175b4c191b0bea6335ade9bb5922ed86a7"
echo ""
echo "📋 Next steps:"
echo "1. Run: cd contracts && npx hardhat run scripts/setup-backend-minter.js --network abstract"
echo "2. Run: cd backend && node index.js"
echo "3. Run: cd frontend && npm run dev" 