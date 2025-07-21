#!/bin/bash

# Update Private Key Script
# This script helps you securely update the private key in contracts/.env

echo "🔐 Private Key Update Script"
echo "============================"
echo ""
echo "This script will help you update the private key for address 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in contracts directory!"
    exit 1
fi

# Show current status
echo "📋 Current .env status:"
if grep -q "your_actual_deployer_private_key_here" .env; then
    echo "   ❌ Private key is still the placeholder"
else
    echo "   ✅ Private key appears to be set"
fi

echo ""
echo "🔧 To update the private key:"
echo "   1. Open contracts/.env in your editor"
echo "   2. Find the line: ABS_WALLET_PRIVATE_KEY=your_actual_deployer_private_key_here"
echo "   3. Replace 'your_actual_deployer_private_key_here' with your actual 32-byte private key"
echo "   4. Save the file"
echo "   5. Run this script again to verify"
echo ""
echo "📝 Example format:"
echo "   ABS_WALLET_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
echo ""
echo "⚠️  Important:"
echo "   - Use the private key for address 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388"
echo "   - 32 bytes = 64 hex characters (no 0x prefix)"
echo "   - This is for testnet only"
echo ""

# Ask if user wants to verify
read -p "Press Enter to verify the private key after you've updated it, or Ctrl+C to cancel..."

# Verify the private key
echo ""
echo "🔍 Verifying private key..."
if node verify-private-key.js; then
    echo ""
    echo "✅ Private key verification successful!"
    echo "🚀 Ready to run ./complete-phase8.sh"
else
    echo ""
    echo "❌ Private key verification failed!"
    echo "   Please check your private key format and try again."
fi 