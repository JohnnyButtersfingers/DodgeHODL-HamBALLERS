#!/bin/bash

echo "🔧 Fixing Environment Configuration..."

# Navigate to the correct directory
cd "$(dirname "$0")"

# Update backend .env file
echo "📝 Updating backend .env file..."
cat > backend/.env << 'EOF'
# === Server Configuration ===
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# === CORS Origins ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# === Supabase Configuration ===
# Replace these with your actual Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# === Blockchain Configuration ===
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
ABSTRACT_TESTNET_CHAIN_ID=11124
NETWORK=abstract

# === Contract Addresses (Updated after deployment) ===
DBP_TOKEN_ADDRESS=
BOOST_NFT_ADDRESS=
HODL_MANAGER_ADDRESS=0x1234567890123456789012345678901234567890
XPBADGE_ADDRESS=0xE960B46dffd9de6187Ff1B48B31B3F186A07303b
XPVERIFIER_ADDRESS=0x5e33911d9c793e5E9172D9e5C4354e21350403E3

# === XP Badge Minting Configuration ===
XPBADGE_MINTER_PRIVATE_KEY=your_minter_private_key_here_do_not_share
XPBADGE_MINTER_ADDRESS=your_minter_address_here

# === Development Settings ===
LOG_LEVEL=debug
ENABLE_MOCK_DB=true

# === Additional Configuration ===
# For Cursor AI and other integrations
SUBABASE_URL=${SUPABASE_URL}
SUBABASE_KEY=${SUPABASE_ANON_KEY}
RPC_URL=${ABSTRACT_RPC_URL}
EOF

echo "✅ Backend .env file updated"

# Update main .env file with missing variables
echo "📝 Updating main .env file..."
cat >> .env << 'EOF'

# ========================================
# Additional Backend Configuration
# ========================================
# Database Configuration (for development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/hamballer
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hamballer
DB_USER=postgres
DB_PASSWORD=password

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://api.testnet.abs.xyz
BLOCKCHAIN_CHAIN_ID=11124
BLOCKCHAIN_NETWORK=abstract

# Backend Minter Configuration
XPBADGE_MINTER_ADDRESS=your_minter_address_here
EOF

echo "✅ Main .env file updated"

echo "🎯 Environment configuration fixed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your private keys in the .env files"
echo "2. Configure Supabase credentials"
echo "3. Run: cd backend && node index.js"
echo "4. Run: cd frontend && npm run dev" 