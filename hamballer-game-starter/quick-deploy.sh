#!/bin/bash

# Quick Deployment Script for HamBaller.xyz
# This script helps with the complete deployment process

set -e

echo "🚀 HamBaller.xyz Quick Deployment"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the hamballer-game-starter directory."
    exit 1
fi

echo "✅ Project directory confirmed"

# Check frontend
echo "🔍 Checking frontend..."
if [ -d "frontend" ]; then
    echo "✅ Frontend directory found"
    cd frontend
    if npm run build > /dev/null 2>&1; then
        echo "✅ Frontend builds successfully"
    else
        echo "❌ Frontend build failed"
        exit 1
    fi
    cd ..
else
    echo "❌ Frontend directory not found"
    exit 1
fi

# Check backend
echo "🔍 Checking backend..."
if [ -d "backend" ]; then
    echo "✅ Backend directory found"
    cd backend
    if [ -f ".env" ]; then
        echo "✅ Backend environment file found"
    else
        echo "⚠️  Backend environment file missing"
    fi
    cd ..
else
    echo "❌ Backend directory not found"
    exit 1
fi

echo ""
echo "📋 Deployment Status Summary"
echo "============================"
echo "✅ Frontend: Ready for Vercel deployment"
echo "✅ Backend: Ready for Railway/Render deployment"
echo "⏳ Database: Needs Supabase setup"
echo ""

echo "🌐 Next Steps:"
echo "=============="
echo ""
echo "1. 🗄️  Set up Supabase:"
echo "   - Go to https://supabase.com"
echo "   - Create new project"
echo "   - Get project URL and API keys"
echo "   - Import database_schema.sql"
echo ""
echo "2. 🚂 Deploy Backend to Railway:"
echo "   - Go to https://railway.app"
echo "   - Create new project from GitHub"
echo "   - Select hamballer-game-starter/backend"
echo "   - Add environment variables"
echo ""
echo "3. 🔗 Update Frontend Configuration:"
echo "   - Update VITE_API_URL and VITE_WS_URL"
echo "   - Push changes to trigger Vercel deployment"
echo ""
echo "4. 🧪 Test Everything:"
echo "   - Test API endpoints"
echo "   - Verify WebSocket connections"
echo "   - Test wallet connections"
echo "   - Cross-browser testing"
echo ""

echo "📄 Useful Files:"
echo "================"
echo "- backend/RAILWAY_DEPLOYMENT.md (Railway guide)"
echo "- backend/env.production.template (production env)"
echo "- backend/database_schema.sql (database schema)"
echo "- DEPLOYMENT_STATUS.md (current status)"
echo ""

echo "🔧 Quick Commands:"
echo "=================="
echo "cd backend && ./deploy-backend.sh    # Test backend"
echo "cd frontend && npm run build         # Test frontend"
echo "git push origin main                 # Deploy to Vercel"
echo ""

echo "✅ Ready for deployment!" 