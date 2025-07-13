#!/bin/bash
echo "🎮 HamBaller.xyz Frontend Deployment Helper"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

echo "🎯 Frontend Deployment to Vercel:"
echo ""

echo "📋 Pre-deployment Checklist:"
echo "✅ Contracts deployed to Abstract testnet"
echo "✅ Backend deployed and running"
echo "✅ Supabase configured"
echo ""

echo "🔧 Environment Variables for Vercel:"
echo "Copy these to your Vercel project settings:"
echo ""
echo "# Abstract Testnet Configuration"
echo "VITE_CHAIN_ID=11124"
echo "VITE_CHAIN_NAME=Abstract Testnet"
echo "VITE_RPC_URL=https://api.testnet.abs.xyz"
echo ""
echo "# Contract Addresses (update with your deployed addresses)"
echo "VITE_DBP_TOKEN_ADDRESS=your_dbp_token_address"
echo "VITE_BOOST_NFT_ADDRESS=your_boost_nft_address" 
echo "VITE_HODL_MANAGER_ADDRESS=your_hodl_manager_address"
echo ""
echo "# Backend API"
echo "VITE_API_URL=your_backend_url_here"
echo "VITE_WS_URL=your_backend_websocket_url_here"
echo ""
echo "# WalletConnect (optional)"
echo "VITE_WALLETCONNECT_PROJECT_ID=your_project_id"
echo ""

echo "📋 Vercel Deployment Steps:"
echo "1. Install Vercel CLI: npm i -g vercel"
echo "2. Login: vercel login"
echo "3. Navigate to frontend: cd frontend"
echo "4. Deploy: vercel --prod"
echo "5. Set environment variables in Vercel dashboard"
echo "6. Redeploy after setting env vars"
echo ""

echo "🧪 Testing Commands:"
echo "# Build locally first"
echo "cd frontend"
echo "npm run build"
echo "npm run preview"
echo ""

echo "🎯 Post-deployment:"
echo "1. Update CORS_ORIGINS in backend with your Vercel domain"
echo "2. Test wallet connection on live site"
echo "3. Verify contract interactions work"
echo "4. Run integration tests"
echo ""

echo "✅ Ready to deploy frontend to Vercel!"
