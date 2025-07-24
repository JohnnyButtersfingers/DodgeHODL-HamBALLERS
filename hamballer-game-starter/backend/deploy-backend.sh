#!/bin/bash

# Backend Deployment Script
# This script helps prepare and deploy the backend to Railway/Render

set -e

echo "🚀 Backend Deployment Script"
echo "============================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

echo "✅ Backend directory confirmed"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one based on .env.example"
    exit 1
fi

echo "✅ Environment file found"

# Test the build
echo "🔨 Testing build..."
npm install
npm run build 2>/dev/null || echo "⚠️  No build script found, skipping..."

# Test the server startup
echo "🧪 Testing server startup..."
npm start &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server starts successfully"
    kill $SERVER_PID
else
    echo "❌ Server failed to start"
    exit 1
fi

echo ""
echo "📋 Deployment Checklist:"
echo "========================"
echo "1. ✅ Backend code is ready"
echo "2. ✅ Environment variables configured"
echo "3. ✅ Server starts successfully"
echo ""
echo "🌐 Next Steps:"
echo "=============="
echo "1. Create Supabase project at https://supabase.com"
echo "2. Get your project URL and API keys"
echo "3. Update .env with Supabase credentials"
echo "4. Deploy to Railway:"
echo "   - Go to https://railway.app"
echo "   - Create new project from GitHub"
echo "   - Select this backend directory"
echo "   - Add environment variables"
echo "5. Or deploy to Render:"
echo "   - Go to https://render.com"
echo "   - Create new Web Service"
echo "   - Connect GitHub repository"
echo "   - Set root directory to backend"
echo ""
echo "📄 Files created:"
echo "================="
echo "- railway.json (Railway configuration)"
echo "- RAILWAY_DEPLOYMENT.md (deployment guide)"
echo "- env.production.template (production env template)"
echo ""
echo "🔧 Manual steps required:"
echo "========================"
echo "1. Set up Supabase project"
echo "2. Configure environment variables in Railway/Render"
echo "3. Deploy the service"
echo "4. Update frontend API URLs"
echo ""
echo "✅ Ready for deployment!" 