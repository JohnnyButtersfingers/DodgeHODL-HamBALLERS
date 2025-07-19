#!/bin/bash
echo "🚀 HamBaller.xyz Backend Deployment Helper"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

echo "🎯 Backend Deployment Options:"
echo "1. Railway (Recommended)"
echo "2. Render"
echo "3. Docker (Manual)"
echo ""

read -p "Choose deployment option (1-3): " choice

case $choice in
    1)
        echo "🚂 Setting up Railway deployment..."
        echo ""
        echo "📋 Railway Deployment Steps:"
        echo "1. Install Railway CLI: npm install -g @railway/cli"
        echo "2. Login: railway login"
        echo "3. Create project: railway new"
        echo "4. Deploy: railway up"
        echo ""
        echo "🔧 Environment Variables to set in Railway:"
        echo "PORT=3001"
        echo "NODE_ENV=production"
        echo "SUPABASE_URL=your_supabase_url"
        echo "SUPABASE_ANON_KEY=your_anon_key"
        echo "SUPABASE_SERVICE_KEY=your_service_key"
        echo "ABSTRACT_RPC_URL=https://api.testnet.abs.xyz"
        echo "PRIVATE_KEY=your_private_key"
        echo "DBP_TOKEN_ADDRESS=your_contract_address"
        echo "BOOST_NFT_ADDRESS=your_contract_address"
        echo "HODL_MANAGER_ADDRESS=your_contract_address"
        echo "CORS_ORIGINS=https://your-frontend-domain.vercel.app"
        ;;
    2)
        echo "🎨 Setting up Render deployment..."
        echo ""
        echo "📋 Render Deployment Steps:"
        echo "1. Go to https://render.com"
        echo "2. Connect your GitHub repository"
        echo "3. Create new Web Service"
        echo "4. Set build command: npm install"
        echo "5. Set start command: npm start"
        echo "6. Add environment variables (see below)"
        echo ""
        echo "🔧 Environment Variables to set in Render:"
        echo "NODE_ENV=production"
        echo "SUPABASE_URL=your_supabase_url"
        echo "SUPABASE_ANON_KEY=your_anon_key"
        echo "SUPABASE_SERVICE_KEY=your_service_key"
        echo "ABSTRACT_RPC_URL=https://api.testnet.abs.xyz"
        echo "PRIVATE_KEY=your_private_key"
        echo "DBP_TOKEN_ADDRESS=your_contract_address"
        echo "BOOST_NFT_ADDRESS=your_contract_address"
        echo "HODL_MANAGER_ADDRESS=your_contract_address"
        echo "CORS_ORIGINS=https://your-frontend-domain.vercel.app"
        ;;
    3)
        echo "🐳 Docker deployment setup..."
        echo ""
        echo "📋 Docker Deployment Steps:"
        echo "1. Build image: docker build -t hamballer-backend ./backend"
        echo "2. Run container: docker run -p 3001:3001 --env-file backend/.env.production hamballer-backend"
        echo ""
        echo "💡 Make sure backend/.env.production is configured with all variables"
        ;;
    *)
        echo "❌ Invalid option. Please choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "✅ Ready to deploy backend!"
echo "🎯 After deployment, update your frontend with the backend URL"
